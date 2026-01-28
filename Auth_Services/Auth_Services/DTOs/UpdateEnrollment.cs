namespace Auth_Services.DTOs
{
    public class UpdateEnrollment
    {
        public int StudentId { get; set; }
        public int OldTurmaId { get; set; }
        public int NewTurmaId { get; set; }
    }
}
