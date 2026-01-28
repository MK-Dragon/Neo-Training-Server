namespace Auth_Services.DTOs
{
    public class NewSala
    {
        public string Nome { get; set; }
        public int TemPcs { get; set; } = 0; // 0 = No, 1 = Yes
        public int TemOficina { get; set; } = 0; // 0 = No, 1 = Yes
    }
}
