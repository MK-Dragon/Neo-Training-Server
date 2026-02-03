namespace Auth_Services.DTOs
{
    public class TurmaCourseModulePlaned
    {
        public int TurmaId { get; set; }
        public string TurmaName { get; set; }
        public int ModuleId { get; set; }
        public string ModuleName { get; set; }
        public int DurationH { get; set; }
        public int OrderIndex { get; set; }
        public int IsModuleDeleted { get; set; }
    }
}
