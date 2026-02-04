using Auth_Services.Models;
using Auth_Services.DTOs;
using Auth_Services.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Auth_Services.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ShceduleController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public ShceduleController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
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

        // Create Entry with Rules
        [HttpPost("add-schedule")]
        public async Task<IActionResult> AddSchedule([FromBody] ScheduleRequest request)
        {
            var result = await _dbServices.CreateSchedule(request);

            if (result == "Success")
                return Ok(new { message = "Schedule added successfully." });

            if (result.Contains("occupied") || result.Contains("08:00"))
                return BadRequest(new { message = result });

            return StatusCode(500, new { error = result });
        }

        // Read Time Frame
        [HttpGet("schedules-range")]
        public async Task<IActionResult> GetSchedulesByRange([FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            // Basic validation: ensure end is not before start
            if (end < start)
            {
                return BadRequest("End date cannot be before start date.");
            }

            try
            {
                var schedules = await _dbServices.GetSchedulesByTimeRange(start, end);
                return Ok(schedules);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching the schedule.", error = ex.Message });
            }
        }

        // Filter by whatever is NOT Null - TODO: TEST!!!
        [HttpGet("schedules-filter")]
        public async Task<IActionResult> GetFilteredSchedules(
                                            [FromQuery] DateTime start,
                                            [FromQuery] DateTime end,
                                            [FromQuery] int? turmaId,
                                            [FromQuery] int? teacherId,
                                            [FromQuery] int? moduleId,
                                            [FromQuery] int? salaId)
        {
            if (end < start) return BadRequest("Invalid date range.");

            try
            {
                var results = await _dbServices.GetSchedulesAdvanced(start, end, turmaId, teacherId, moduleId, salaId); // List<ScheduleDetailsDTO>
                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }




    } // the end
}
