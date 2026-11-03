import { useState, type FormEvent } from "react";

import type { Reservation, Resource } from "../api/campushubApi";
import { useCreateReservation } from "../hooks/useCreateReservation";
import styles from "./BookingForm.module.css";

export interface BookingFormProps {
  resource: Resource | null;
  userId: string;
  onReservationCreated: (reservation: Reservation) => void;
}

export function BookingForm({
  resource,
  userId,
  onReservationCreated,
}: BookingFormProps) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const { isLoading, error, successMessage, submit } = useCreateReservation({
    resource,
    userId,
    onCreated: onReservationCreated,
  });

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (await submit(startTime, endTime)) {
      setStartTime("");
      setEndTime("");
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="booking-heading">
      <p className={styles.eyebrow}>Plan your visit</p>
      <h2 id="booking-heading">Book a resource</h2>
      <p className={styles.selection}>
        {resource ? (
          <>
            Reserving <strong>{resource.name}</strong> · {resource.location}
          </>
        ) : (
          "Choose an available resource from the directory."
        )}
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <label>
          <span>Start time</span>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            required
          />
        </label>
        <label>
          <span>End time</span>
          <input
            type="datetime-local"
            value={endTime}
            min={startTime || undefined}
            onChange={(event) => setEndTime(event.target.value)}
            required
          />
        </label>

        {error && (
          <div className="alert alertError" role="alert">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="alert alertSuccess" role="status">
            {successMessage}
          </div>
        )}

        <button type="submit" disabled={isLoading || !resource}>
          {isLoading ? "Creating reservation…" : "Confirm booking"}
        </button>
      </form>
    </section>
  );
}
