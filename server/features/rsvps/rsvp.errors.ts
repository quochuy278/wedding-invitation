export class RsvpAlreadyAttendedError extends Error {
  constructor() {
    super("Attendance has already been recorded.");
    this.name = "RsvpAlreadyAttendedError";
  }
}
