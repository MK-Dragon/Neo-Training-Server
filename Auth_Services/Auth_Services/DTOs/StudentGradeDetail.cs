namespace Auth_Services.DTOs
{
    public class StudentGradeDetail
    {
        public int StudentId { get; set; }
        public string StudentName { get; set; }
        public int ModuleId { get; set; }
        public string ModuleName { get; set; }
        public int? Grade { get; set; }
    }
}
