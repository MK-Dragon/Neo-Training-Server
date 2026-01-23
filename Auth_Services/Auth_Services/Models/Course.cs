namespace Auth_Services.Models
{
    public class Course
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int durationInHours { get; set; }
        public string Level { get; set; }


        public int IsDeleted { get; set; } // 0 = Active, 1 = Deleted

        public List<Module> Modules { get; set; } = new List<Module>();
    }
}
