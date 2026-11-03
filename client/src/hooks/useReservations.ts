import { useEffect, useState } from "react";

import {
  cancelReservation,
  fetchUserReservations,
  getErrorMessage,
  type Reservation,
} from "../api/campushubApi";

export interface UseReservationsResult {
  reservations: Reservation[];
  isLoading: boolean;
  cancellingId: string | null;
  error: string | null;
  cancel: (reservationId: string) => Promise<void>;
}

export function useReservations(
  userId: string,
  refreshKey: number,
): UseReservationsResult {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
      setReservations([]);
      setIsLoading(false);
      setError(null);
      return () => {
        current = false;
      };
    }

    setIsLoading(true);
    setError(null);
    void fetchUserReservations(normalizedUserId)
      .then((result) => {
        if (current) {
          setReservations(
            result.filter(({ status }) => status !== "CANCELLED"),
          );
        }
      })
      .catch((loadError: unknown) => {
        if (current) {
          setError(
            getErrorMessage(loadError, "Unable to load your reservations."),
          );
        }
      })
      .finally(() => {
        if (current) {
          setIsLoading(false);
        }
      });

    return () => {
      current = false;
    };
  }, [userId, refreshKey]);

  async function cancel(reservationId: string): Promise<void> {
    setCancellingId(reservationId);
    setError(null);
    try {
      await cancelReservation(reservationId);
      setReservations((current) =>
        current.filter(({ id }) => id !== reservationId),
      );
    } catch (cancelError: unknown) {
      setError(
        getErrorMessage(cancelError, "Unable to cancel the reservation."),
      );
    } finally {
      setCancellingId(null);
    }
  }

  return { reservations, isLoading, cancellingId, error, cancel };
}
