// Program.cs

using Auth_Services.Services;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;



var builder = WebApplication.CreateBuilder(args);





// adding settings:S
// Adding Connection Settigs as a singleton
var connectionSettings = SettingsManager.CurrentSettings.GetAwaiter().GetResult();
builder.Services.AddSingleton(connectionSettings);


// Load the shared .env file
// 1. Get the directory where the code is running
string currentPath = Directory.GetCurrentDirectory();

// 2. Search upwards for the .env file
string envPath = "";
DirectoryInfo? directory = new DirectoryInfo(currentPath);

while (directory != null)
{
    string potentialPath = Path.Combine(directory.FullName, ".env");
    if (File.Exists(potentialPath))
    {
        envPath = potentialPath;
        break;
    }
    directory = directory.Parent;
}

if (!string.IsNullOrEmpty(envPath))
{
    DotNetEnv.Env.Load(envPath);
    Console.WriteLine($"[SUCCESS] Loaded .env from: {envPath}");
}
else
{
    Console.WriteLine("[ERROR] Could not find .env file in any parent directory.");
}



// 1. Define a Secret Key (Crucial for security!)
// Store this securely, preferably in configuration (appsettings.json or a Secret Manager)
var jwtKey = builder.Configuration["Jwt:Key"] ?? "ThisIsADefaultSecretKeyThatShouldBeLongerAndStoredSecurely";

// 2. Add Authentication Services
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        // Require the token to be signed by the secret key
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtKey)),

        // You generally validate these parameters for incoming tokens
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"], // e.g., "YourApiDomain"
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"], // e.g., "YourClientApp"

        // Lifetime validation
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero, // Remove default 5-minute clock skew

        // Map standard claims
        RoleClaimType = ClaimTypes.Role
    };
});

// 3. Add Authorization Middleware (Requires tokens to be validated)
builder.Services.AddAuthorization();
builder.Services.AddTransient<TokenService>();

builder.Services.AddHttpContextAccessor();




// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();




/*/ cors policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        builder => builder
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod());
});*/

builder.Services.AddCors(options => {
    options.AddPolicy("AllowVite",
        policy => policy.WithOrigins("http://localhost:5173") // Vite URL
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});




var app = builder.Build();

app.UseHttpsRedirection();

app.UseRouting();

app.UseCors("AllowVite");

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 4. USE Authentication and Authorization Middleware
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
