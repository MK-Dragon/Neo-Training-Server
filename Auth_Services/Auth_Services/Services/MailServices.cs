using System.Net;
using System.Net.Mail;
using Auth_Services.Models;

namespace Auth_Services.Services
{
    public class MailServices
    {
        private string _mailServer;
        private string _mailKey;

        public MailServices()
        {
            ConnectionSettings settings = SettingsManager.CurrentSettings.Result;
            _mailServer = settings.MailServer;
            _mailKey = settings.MailKey;
        }

        public async Task<bool> SendMail(string toEmail, string subject, string body)
        {
            // Send e-mail to user
            MailMessage mail = new MailMessage();
            SmtpClient servidor = new SmtpClient();

            try
            {
                mail.From = new MailAddress(_mailServer);
                mail.To.Add(new MailAddress(toEmail));
                mail.Subject = subject;
                mail.IsBodyHtml = true;
                mail.Body = body;



                servidor.Host = "smtp.gmail.com";
                servidor.Port = 587;
                servidor.Credentials = new NetworkCredential(_mailServer, _mailKey);

                servidor.EnableSsl = true;

                servidor.Send(mail);
                Console.WriteLine("E-Mail Sent!");
                return true;
            }
            catch (Exception ex)
            {
                Console.Write($"Error: {ex}");
                return false;
            }
        }
    }
}
