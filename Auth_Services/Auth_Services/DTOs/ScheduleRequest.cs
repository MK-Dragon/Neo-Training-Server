namespace Auth_Services.DTOs
{
    public class ScheduleRequest
    {
        public int TurmaId { get; set; }
        public int ModuleId { get; set; }
        public int FormadorId { get; set; }
        public int SalaId { get; set; }
        public DateTime DateTime { get; set; }
    }
}
