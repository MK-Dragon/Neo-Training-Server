namespace Auth_Services.Models
{
    public class ConnectionSettings
    {
        // Database Connection
        public string UserDb { get; set; } = "user";
        public string PassDb { get; set; } = string.Empty;
        public string IpDb { get; set; } = "localhost";
        public int PortDb { get; set; } = 3306;

        // Redis Connection
        public string IpRedis { get; set; } = "localhost";
        public int PortRedis { get; set; } = 6379;
    }
}
