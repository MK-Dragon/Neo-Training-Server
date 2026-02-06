using Auth_Services.Models;
using Auth_Services.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace Auth_Services.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DownloadUploadController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public DownloadUploadController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
        {
            _dbServices = new DbServices(
                // MySQL
                connectionSettings.IpDb,
                connectionSettings.PortDb,
                "mydb",
                connectionSettings.UserDb,
                connectionSettings.PassDb,
                // Redis
                connectionSettings.IpRedis,
                connectionSettings.PortRedis
                );
            _tokenService = tokenService;
            _httpContextAccessor = httpContextAccessor;
        }

        // * Uploading profile image
        [HttpPost("upload-profile-image/{userId}")]
        public async Task<IActionResult> UploadImageToDb(int userId, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("File is empty.");

            using (var memoryStream = new MemoryStream())
            {
                await file.CopyToAsync(memoryStream);
                byte[] fileData = memoryStream.ToArray();

                int fileId = await _dbServices.SaveFileToDb(file.FileName, fileData);

                if (fileId > 0)
                {
                    await _dbServices.LinkImageToUser(userId, fileId);
                    return Ok(new { message = "Image saved to database.", fileId = fileId });
                }
            }

            return StatusCode(500, "Failed to save image to DB.");
        }

        // Get Image from DB
        [HttpGet("get-profile-image/{fileId}")]
        public async Task<IActionResult> GetProfileImage(int fileId)
        {
            try
            {
                // 1. Get the raw byte array from the database
                byte[] imageData = await _dbServices.GetFileBytes(fileId);

                if (imageData == null || imageData.Length == 0)
                {
                    return NotFound("Image not found.");
                }

                // 2. Pass 'imageData' directly (no .Bytes needed)
                return File(imageData, "image/png");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error retrieving image: {ex.Message}");
            }
        }

        // * Get User profile image
        [HttpGet("profile-image/{userId}")]
        public async Task<IActionResult> GetUserProfileImage(int userId)
        {
            var (imageData, fileType) = await _dbServices.GetUserImageByUserId(userId);

            if (imageData == null || imageData.Length == 0)
            {
                // Return a 404 if the user has no image
                return NotFound(new { message = "User does not have a profile image." });
            }

            // Determine MIME type based on file_type column
            string mimeType = fileType?.ToLower() switch
            {
                ".png" => "image/png",
                ".gif" => "image/gif",
                ".webp" => "image/webp",
                _ => "image/jpeg"
            };

            return File(imageData, mimeType);
        }

    } // the end
}
