import { useEffect, useState } from "react";

import {
  ApiError,
  createReservation,
  getErrorMessage,
  type Reservation,
  type Resource,
} from "../api/campushubApi";

export interface UseCreateReservationOptions {
  resource: Resource | null;
  userId: string;
  onCreated: (reservation: Reservation) => void;
}

export interface UseCreateReservationResult {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  submit: (startTime: string, endTime: string) => Promise<boolean>;
}

function validateTimes(startTime: string, endTime: string): string | null {
  if (!startTime || !endTime) {
    return "Choose both a start and end time.";
  }
  return new Date(startTime).getTime() >= new Date(endTime).getTime()
    ? "End time must be later than start time."
    : null;
}

export function useCreateReservation({
  resource,
  userId,
  onCreated,
}: UseCreateReservationOptions): UseCreateReservationResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setSuccessMessage(null);
  }, [resource?.id]);

  async function submit(startTime: string, endTime: string): Promise<boolean> {
    setError(null);
    setSuccessMessage(null);

    if (!resource) {
      setError("Select an available resource before booking.");
      return false;
    }
    if (!userId.trim()) {
      setError("Enter a student ID before booking.");
      return false;
    }

    const validationError = validateTimes(startTime, endTime);
    if (validationError) {
      setError(validationError);
      return false;
    }

    setIsLoading(true);
    try {
      const reservation = await createReservation({
        resourceId: resource.id,
        userId: userId.trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      setSuccessMessage(
        `${resource.name} is reserved and pending confirmation.`,
      );
      onCreated(reservation);
      return true;
    } catch (bookingError: unknown) {
      setError(
        bookingError instanceof ApiError && bookingError.status === 409
          ? "This resource is already reserved for the selected time window."
          : getErrorMessage(bookingError, "Unable to create the reservation."),
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  return { isLoading, error, successMessage, submit };
}
