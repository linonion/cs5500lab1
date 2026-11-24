Feature: Campus Resource Reservation Engine

  Scenario: Student successfully reserves an available study room
    Given a student is on the CampusHub home page
    When they filter resources by type "ROOM"
    And they select "Study Room 302"
    And they submit a reservation for a future available time
    Then they should see a "Reservation Confirmed" success message
    And the reservation should appear in their "My bookings" list

  Scenario: Student receives conflict alert on double-booking
    Given a resource "3D Printer A" is already reserved at a future time
    When another student attempts to reserve "3D Printer A" at the same time
    Then the system should display a conflict alert "Resource unavailable for selected time"
    And the reservation request should not be created
