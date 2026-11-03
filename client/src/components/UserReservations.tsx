import { useReservations } from "../hooks/useReservations";
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
  const { reservations, isLoading, cancellingId, error, cancel } =
    useReservations(userId, refreshKey);

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
              onClick={() => void cancel(reservation.id)}
            >
              {cancellingId === reservation.id ? "Cancelling…" : "Cancel"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
