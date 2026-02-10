namespace Auth_Services.DTOs
{
    public class ModuleProgressDTO
    {
        public string ModuleName { get; set; }
        public int TargetDuration { get; set; } // The theoretical hours (from modules table)
        public int TotalScheduled { get; set; }  // Total slots found in schedules
        public int HoursTaught { get; set; }    // Slots where date_time <= NOW()

        // Helper property to calculate what's left to schedule
        public int RemainingToSchedule => TargetDuration - TotalScheduled;

        // Helper property to calculate what's left to teach
        public int RemainingToTeach => TargetDuration - HoursTaught;
    }
}
