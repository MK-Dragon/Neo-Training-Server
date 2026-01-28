namespace Auth_Services.DTOs
{
    public class ModuleUpdate
    {
        public int ModuleId { get; set; }
        public string Name { get; set; }
        public int DurationH { get; set; }
        public int IsDeleted { get; set; }
    }
}
