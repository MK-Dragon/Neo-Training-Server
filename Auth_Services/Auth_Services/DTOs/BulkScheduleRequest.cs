namespace Auth_Services.DTOs
{
    public class BulkScheduleRequest
    {
        public int TurmaId { get; set; }
        public int ModuleId { get; set; }
        public int FormadorId { get; set; }
        public int SalaId { get; set; }
        public DateTime StartTime { get; set; } // e.g., 2026-02-10 09:00:00
        public DateTime EndTime { get; set; }   // e.g., 2026-02-10 11:00:00
    }
}
