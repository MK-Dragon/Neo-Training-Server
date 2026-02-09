namespace Auth_Services.DTOs
{
    public class TeacherRankingDTO
    {
        public int TeacherId { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public int TotalClassesTaught { get; set; }
    }
}
