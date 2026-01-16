using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Auth_Services.Services
{
    public class TokenService
    {
        private readonly IConfiguration _configuration;

        public TokenService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string GenerateToken(string username, string role)
        {
            var jwtKey = _configuration["Jwt:Key"];
            var issuer = _configuration["Jwt:Issuer"];
            var audience = _configuration["Jwt:Audience"];

            // 1. Define Claims (Information about the authenticated user)
            var claims = new[]
            {
            new Claim(JwtRegisteredClaimNames.Sub, username), // Unique identifier
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()), // Unique token ID
            new Claim(ClaimTypes.Name, username), // Standard claim for username
            new Claim(ClaimTypes.Role, role)
        };

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            // 2. Create the Token Descriptor
            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.Now.AddHours(2), // Token is valid for 2 hours
                signingCredentials: credentials);

            // 3. Write the Token as a string
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
