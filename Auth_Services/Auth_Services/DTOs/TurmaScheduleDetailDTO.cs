namespace Auth_Services.DTOs
{
    public class TurmaScheduleDetailDTO
    {
        public DateTime DateTime { get; set; }
        public int ModuleId { get; set; }
        public string ModuleName { get; set; }
        public int TeacherId { get; set; }
        public string TeacherName { get; set; }
        public int SalaId { get; set; }
        public string SalaNome { get; set; }
    }
}
