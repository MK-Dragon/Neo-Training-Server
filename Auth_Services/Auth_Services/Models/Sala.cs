namespace Auth_Services.Models
{
    public class Sala
    {
        public int Id { get; set; }
        public string Nome { get; set; }
        public int TemPcs { get; set; } = 0; // 0 = No, 1 = Yes
        public int TemOficina { get; set; } = 0; // 0 = No, 1 = Yes
        public int IsDeleted { get; set; } = 0;
    }
}
