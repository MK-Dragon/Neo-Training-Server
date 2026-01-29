namespace Auth_Services.Models
{
    public class TeacherAvailability
    {
        public int FormadorId { get; set; }
        public DateTime DataHora { get; set; }
        public int Disponivel { get; set; } // 1 for Available, 0 for Busy
    }
}
