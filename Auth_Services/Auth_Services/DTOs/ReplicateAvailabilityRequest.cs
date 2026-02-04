namespace Auth_Services.DTOs
{
    public class ReplicateAvailabilityRequest
    {
        public int FormadorId { get; set; }
        public DateTime TemplateDate { get; set; } // The day you already filled out
    }
}
