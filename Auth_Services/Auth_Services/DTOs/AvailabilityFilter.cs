namespace Auth_Services.DTOs
{
    public class AvailabilityFilter
    {
        public int FormadorId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
    }
}
