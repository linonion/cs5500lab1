import { useEffect, useState, type FormEvent } from "react";

import {
  ApiError,
  createReservation,
  type Reservation,
  type Resource,
} from "../api/campushubApi";
import styles from "./BookingForm.module.css";

export interface BookingFormProps {
  resource: Resource | null;
  userId: string;
  onReservationCreated: (reservation: Reservation) => void;
}

function validateTimes(startTime: string, endTime: string): string | null {
  if (!startTime || !endTime) {
    return "Choose both a start and end time.";
  }

  if (new Date(startTime).getTime() >= new Date(endTime).getTime()) {
    return "End time must be later than start time.";
  }

  return null;
}

export function BookingForm({
  resource,
  userId,
  onReservationCreated,
}: BookingFormProps) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setSuccessMessage(null);
  }, [resource?.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!resource) {
      setError("Select an available resource before booking.");
      return;
    }
    if (!userId.trim()) {
      setError("Enter a student ID before booking.");
      return;
    }

    const validationError = validateTimes(startTime, endTime);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const reservation = await createReservation({
        resourceId: resource.id,
        userId: userId.trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      setSuccessMessage(`${resource.name} is reserved and pending confirmation.`);
      setStartTime("");
      setEndTime("");
      onReservationCreated(reservation);
    } catch (bookingError: unknown) {
      if (bookingError instanceof ApiError && bookingError.status === 409) {
        setError("This resource is already reserved for the selected time window.");
      } else {
        setError(
          bookingError instanceof Error
            ? bookingError.message
            : "Unable to create the reservation.",
        );
      }
    } finally {
      setIsLoading(false);
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
