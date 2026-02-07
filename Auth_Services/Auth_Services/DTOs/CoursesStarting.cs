namespace Auth_Services.DTOs
{
    public class CoursesStarting
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int durationInHours { get; set; }
        public string Level { get; set; }
        public DateTime? DateStart { get; set; }
    }
}
