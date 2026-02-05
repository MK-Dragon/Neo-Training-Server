namespace Auth_Services.DTOs
{
    public class TeacherScheduleDetailDTO
    {
        public DateTime DateTime { get; set; }
        public int TurmaId { get; set; }
        public string TurmaName { get; set; }
        public int ModuleId { get; set; }
        public string ModuleName { get; set; }
        public int TotalDuration { get; set; }
        public int HoursCompleted { get; set; }
        public int SalaId { get; set; }
        public string SalaNome { get; set; }
        public int HasPc { get; set; }
        public int HasOficina { get; set; }
    }
}
