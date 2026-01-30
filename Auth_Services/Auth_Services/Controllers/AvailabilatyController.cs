using Auth_Services.DTOs;
using Auth_Services.Models;
using Auth_Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Auth_Services.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AvailabilatyController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public AvailabilatyController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
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


        [HttpPost("set-availability")]
        [AllowAnonymous]
        public async Task<IActionResult> SetAvailability([FromBody] TeacherAvailability availability)
        {
            if (availability == null || availability.FormadorId <= 0)
            {
                return BadRequest("Invalid availability data.");
            }

            try
            {
                bool success = await _dbServices.AddTeacherAvailability(availability);

                if (!success)
                {
                    return BadRequest("Failed to set availability. Ensure the user is a Teacher and active.");
                }

                return Ok(new { message = "Availability updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("update-availability")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateAvailability([FromBody] UpdateAvailability data) // Change variable name to 'data'
        {
            // Check if the whole object is null
            if (data == null) return BadRequest("No data received.");

            // Check internal properties
            if (data.FormadorId <= 0)
            {
                return BadRequest($"Invalid availability ID.");
            }

            try
            {
                bool success = await _dbServices.UpdateAvailability(data);
                if (!success) return NotFound(new { message = "Availability record not found." });
                return Ok(new { message = "Availability updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("teacher-availability")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAvailability([FromQuery] int formadorId, [FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            if (start > end)
            {
                return BadRequest("Invalid search parameters. Start time must be before end time.");
            }

            try
            {
                var filter = new AvailabilityFilter
                {
                    FormadorId = formadorId,
                    StartTime = start,
                    EndTime = end
                };

                var results = await _dbServices.GetTeacherAvailability(filter); // List<TeacherAvailability>
                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }








    } // End of AvailabilatyController class
}
