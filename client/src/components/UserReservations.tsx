import { useEffect, useState } from "react";

import {
  cancelReservation,
  fetchUserReservations,
  type Reservation,
} from "../api/campushubApi";
import styles from "./UserReservations.module.css";

export interface UserReservationsProps {
  userId: string;
  refreshKey: number;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function UserReservations({
  userId,
  refreshKey,
}: UserReservationsProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadReservations(isCurrent: () => boolean): Promise<void> {
    if (!userId.trim()) {
      setReservations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchUserReservations(userId.trim());
      if (isCurrent()) {
        setReservations(result.filter(({ status }) => status !== "CANCELLED"));
      }
    } catch (loadError: unknown) {
      if (isCurrent()) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your reservations.",
        );
      }
    } finally {
      if (isCurrent()) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    let current = true;
    void loadReservations(() => current);
    return () => {
      current = false;
    };
  }, [userId, refreshKey]);

  async function handleCancel(reservationId: string): Promise<void> {
    setCancellingId(reservationId);
    setError(null);
    try {
      await cancelReservation(reservationId);
      setReservations((current) =>
        current.filter(({ id }) => id !== reservationId),
      );
    } catch (cancelError: unknown) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to cancel the reservation.",
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="reservations-heading">
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>Your schedule</p>
          <h2 id="reservations-heading">My bookings</h2>
        </div>
        <span className={styles.count}>{reservations.length} active</span>
      </div>

      {isLoading && <p className={styles.state}>Loading your bookings…</p>}
      {error && (
        <div className="alert alertError" role="alert">
          {error}
        </div>
      )}
      {!isLoading && !error && !userId.trim() && (
        <p className={styles.state}>Enter a student ID to view bookings.</p>
      )}
      {!isLoading && !error && userId.trim() && reservations.length === 0 && (
        <p className={styles.state}>You have no active reservations.</p>
      )}

      <div className={styles.list} aria-live="polite">
        {reservations.map((reservation) => (
          <article className={styles.reservation} key={reservation.id}>
            <div>
              <span className={styles.status}>{reservation.status}</span>
              <h3>Resource {reservation.resourceId}</h3>
              <p>
                {dateFormatter.format(new Date(reservation.startTime))}
                <span aria-hidden="true"> → </span>
                <span className="srOnly"> until </span>
                {dateFormatter.format(new Date(reservation.endTime))}
              </p>
            </div>
            <button
              className={styles.cancelButton}
              type="button"
              disabled={cancellingId === reservation.id}
              onClick={() => void handleCancel(reservation.id)}
            >
              {cancellingId === reservation.id ? "Cancelling…" : "Cancel"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
