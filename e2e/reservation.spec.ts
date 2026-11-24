import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

interface ReservationResponse {
  id: string;
  resourceId: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
}

interface TestWindow {
  start: Date;
  end: Date;
}

const resourceIds = {
  room: "res-room-302",
  printer: "res-printer-a",
} as const;

function createTestWindow(
  projectName: string,
  scenarioOffset: number,
): TestWindow {
  const projectOffset = ["chromium", "firefox", "webkit"].indexOf(projectName);
  const start = new Date();
  start.setDate(start.getDate() + 30);
  start.setHours(
    9 + Math.max(projectOffset, 0) * 2 + scenarioOffset,
    start.getMinutes(),
    start.getSeconds(),
    0,
  );

  return {
    start,
    end: new Date(start.getTime() + 60 * 60 * 1000),
  };
}

function toDateTimeLocalValue(value: Date): string {
  const pad = (part: number): string => String(part).padStart(2, "0");
  return [
    value.getFullYear(),
    "-",
    pad(value.getMonth() + 1),
    "-",
    pad(value.getDate()),
    "T",
    pad(value.getHours()),
    ":",
    pad(value.getMinutes()),
    ":",
    pad(value.getSeconds()),
  ].join("");
}

function uniqueUserId(prefix: string, projectName: string): string {
  return `${prefix}-${projectName}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function selectResource(
  page: Page,
  type: "ROOM" | "EQUIPMENT",
  resourceName: string,
): Promise<void> {
  await page.getByLabel("Resource type").selectOption(type);
  const resourceCard = page
    .getByRole("article")
    .filter({ hasText: resourceName });
  await expect(resourceCard).toBeVisible();
  await resourceCard.getByRole("button", { name: "Reserve" }).click();
}

async function submitBooking(page: Page, window: TestWindow): Promise<void> {
  await page.getByLabel("Start time").fill(toDateTimeLocalValue(window.start));
  await page.getByLabel("End time").fill(toDateTimeLocalValue(window.end));
  await page.getByRole("button", { name: "Confirm booking" }).click();
}

async function createReservation(
  request: APIRequestContext,
  resourceId: string,
  userId: string,
  window: TestWindow,
): Promise<ReservationResponse> {
  const response = await request.post("/api/v1/reservations", {
    data: {
      resourceId,
      userId,
      startTime: window.start.toISOString(),
      endTime: window.end.toISOString(),
    },
  });
  expect(response.status()).toBe(201);
  return response.json() as Promise<ReservationResponse>;
}

async function cancelReservation(
  request: APIRequestContext,
  reservationId: string,
): Promise<void> {
  const response = await request.patch(
    `/api/v1/reservations/${encodeURIComponent(reservationId)}/cancel`,
  );
  expect(response.ok()).toBeTruthy();
}

async function cancelUserReservations(
  request: APIRequestContext,
  userId: string,
): Promise<void> {
  const response = await request.get(
    `/api/v1/reservations/user/${encodeURIComponent(userId)}`,
  );
  expect(response.ok()).toBeTruthy();
  const reservations = (await response.json()) as ReservationResponse[];
  await Promise.all(
    reservations
      .filter(({ status }) => status !== "CANCELLED")
      .map(({ id }) => cancelReservation(request, id)),
  );
}

async function findAvailableWindow(
  request: APIRequestContext,
  resourceId: string,
  projectName: string,
  scenarioOffset: number,
): Promise<TestWindow> {
  for (let dayOffset = 0; dayOffset < 10; dayOffset += 1) {
    const window = createTestWindow(projectName, scenarioOffset);
    window.start.setDate(window.start.getDate() + dayOffset);
    window.end.setDate(window.end.getDate() + dayOffset);
    const response = await request.post("/api/v1/reservations", {
      data: {
        resourceId,
        userId: uniqueUserId("availability-probe", projectName),
        startTime: window.start.toISOString(),
        endTime: window.end.toISOString(),
      },
    });

    if (response.status() === 201) {
      const probe = (await response.json()) as ReservationResponse;
      await cancelReservation(request, probe.id);
      return window;
    }
    if (response.status() !== 409) {
      throw new Error(
        `Availability probe failed with unexpected status ${response.status()}.`,
      );
    }
  }

  throw new Error("Unable to find an available E2E reservation window.");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Resource directory" }),
  ).toBeVisible();
});

test("student successfully reserves an available study room", async ({
  page,
  request,
}, testInfo) => {
  const userId = uniqueUserId("successful-booking", testInfo.project.name);
  const window = await findAvailableWindow(
    request,
    resourceIds.room,
    testInfo.project.name,
    0,
  );

  try {
    await page.getByLabel("Student ID").fill(userId);
    await selectResource(page, "ROOM", "Study Room 302");
    await submitBooking(page, window);

    await expect(page.getByRole("status")).toContainText(
      "Reservation Confirmed",
    );
    const bookings = page.getByRole("region", { name: "My bookings" });
    await expect(
      bookings.getByRole("heading", { name: `Resource ${resourceIds.room}` }),
    ).toBeVisible();
    await expect(bookings.getByText("PENDING")).toBeVisible();
  } finally {
    await cancelUserReservations(request, userId);
  }
});

test("student receives conflict alert on double-booking", async ({
  page,
  request,
}, testInfo) => {
  const existingUserId = uniqueUserId(
    "existing-booking",
    testInfo.project.name,
  );
  const otherUserId = uniqueUserId(
    "conflicting-booking",
    testInfo.project.name,
  );
  const window = await findAvailableWindow(
    request,
    resourceIds.printer,
    testInfo.project.name,
    1,
  );
  const existingReservation = await createReservation(
    request,
    resourceIds.printer,
    existingUserId,
    window,
  );

  try {
    await page.getByLabel("Student ID").fill(otherUserId);
    await selectResource(page, "EQUIPMENT", "3D Printer A");
    await submitBooking(page, window);

    await expect(page.getByRole("alert")).toHaveText(
      "Resource unavailable for selected time.",
    );
    const reservationsResponse = await request.get(
      `/api/v1/reservations/user/${encodeURIComponent(otherUserId)}`,
    );
    expect(reservationsResponse.ok()).toBeTruthy();
    expect(
      (await reservationsResponse.json()) as ReservationResponse[],
    ).toEqual([]);
  } finally {
    await cancelReservation(request, existingReservation.id);
  }
});
