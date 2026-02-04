namespace Auth_Services.DTOs
{
    public class ScheduleDetailsDTO
    {
        public int ScheduleId { get; set; }
        public string TurmaName { get; set; }
        public string ModuleName { get; set; }
        public string TeacherName { get; set; }
        public string SalaNome { get; set; }
        public DateTime DateTime { get; set; }
    }
}
