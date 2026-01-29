namespace Auth_Services.DTOs
{
    public class UpdateAvailability
    {
        public int DispoId { get; set; }
        public int Disponivel { get; set; } // 1 for Available, 0 for Busy
        public DateTime DataHora { get; set; }
    }
}
