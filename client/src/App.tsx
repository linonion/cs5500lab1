import { useState } from "react";

import type { Reservation, Resource } from "./api/campushubApi";
import styles from "./App.module.css";
import { BookingForm } from "./components/BookingForm";
import { ResourceList } from "./components/ResourceList";
import { UserReservations } from "./components/UserReservations";

export default function App() {
  const [userId, setUserId] = useState("student-1");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [reservationRefreshKey, setReservationRefreshKey] = useState(0);

  function handleReservationCreated(_reservation: Reservation): void {
    setReservationRefreshKey((current) => current + 1);
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="CampusHub home">
          <span className={styles.brandMark}>CH</span>
          CampusHub
        </a>
        <label className={styles.userControl}>
          <span>Student ID</span>
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="student-1"
          />
        </label>
      </header>

      <main id="top">
        <section className={styles.hero}>
          <p>One campus. Every resource.</p>
          <h1>Make space for your best work.</h1>
          <span>
            Find the right room, lab, or equipment and reserve it in minutes.
          </span>
        </section>

        <ResourceList
          selectedResourceId={selectedResource?.id}
          onSelectResource={setSelectedResource}
        />

        <div className={styles.workspace}>
          <BookingForm
            resource={selectedResource}
            userId={userId}
            onReservationCreated={handleReservationCreated}
          />
          <UserReservations
            userId={userId}
            refreshKey={reservationRefreshKey}
          />
        </div>
      </main>

      <footer>CampusHub · Campus resources, thoughtfully coordinated.</footer>
    </div>
  );
}
