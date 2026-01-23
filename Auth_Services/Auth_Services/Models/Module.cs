namespace Auth_Services.Models
{
    public class Module
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int DurationInHours { get; set; }

        public int isDeleted { get; set; } // 0 = Active, 1 = Deleted
    }
}
