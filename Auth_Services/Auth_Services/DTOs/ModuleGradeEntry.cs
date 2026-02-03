namespace Auth_Services.DTOs
{
    public class ModuleGradeEntry
    {
        // Read / Write to/from db
        public int StudentId { get; set; }
        public string StudentName { get; set; }
        public int? Grade { get; set; }
        public int EnrollmentId { get; set; }
    }
}
