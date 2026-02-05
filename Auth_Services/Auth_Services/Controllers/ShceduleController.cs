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
                var schedules = await _dbServices.GetSchedulesByTimeRange(start, end); // List<ScheduleDetailsDTO>
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
                return Ok(results); // List<ScheduleDetailsDTO>
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Update Entry
        [HttpPut("update-schedule")]
        public async Task<IActionResult> UpdateSchedule([FromBody] ScheduleDetailsDTO request)
        {
            if (request.ScheduleId <= 0) return BadRequest("Valid Schedule ID is required.");

            var result = await _dbServices.UpdateSchedule(request);

            if (result == "Success")
                return Ok(new { message = "Schedule updated successfully." });

            if (result.Contains("occupied") || result.Contains("available") || result.Contains("08:00"))
                return BadRequest(new { message = result });

            return StatusCode(500, new { error = result });
        }


        // Delete Entry
        [HttpDelete("delete-schedule/{scheduleId}")]
        public async Task<IActionResult> DeleteSchedule(int scheduleId)
        {
            if (scheduleId <= 0) return BadRequest("Invalid Schedule ID.");

            try
            {
                bool success = await _dbServices.DeleteSchedule(scheduleId);

                if (!success)
                {
                    return NotFound(new { message = $"Schedule with ID {scheduleId} not found or already deleted." });
                }

                return Ok(new { message = "Schedule entry deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error during deletion.", details = ex.Message });
            }
        }


        // ** GET TEACHER SCHEDULE!!! **
        [HttpGet("teacher/{teacherId}/schedule")]
        public async Task<IActionResult> GetTeacherSchedule(int teacherId, [FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            if (teacherId <= 0) return BadRequest("Invalid Teacher ID.");

            try
            {
                // Return type: Task<List<TeacherScheduleDetailDTO>>
                var schedule = await _dbServices.GetTeacherScheduleByRange(teacherId, start, end);

                if (schedule == null || schedule.Count == 0)
                {
                    return Ok(new { message = "No classes scheduled for this period.", data = new List<TeacherScheduleDetailDTO>() });
                }

                return Ok(schedule);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error.", details = ex.Message });
            }
        }

        // ** GET TURMA SCHEDULE!!! **
        [HttpGet("turma/{turmaId}/schedule")]
        public async Task<IActionResult> GetTurmaSchedule(int turmaId, [FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            if (turmaId <= 0) return BadRequest("Invalid Turma ID.");

            try
            {
                // Return type: Task<List<TurmaScheduleDetailDTO>>
                var schedule = await _dbServices.GetTurmaScheduleByRange(turmaId, start, end);

                if (schedule == null || schedule.Count == 0)
                {
                    return Ok(new { message = "No classes found for this turma in the selected period.", data = new List<TurmaScheduleDetailDTO>() });
                }

                return Ok(schedule);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error.", details = ex.Message });
            }
        }

        // ** GET STUDENT SCHEDULE!!! **
        [HttpGet("student/{studentId}/schedule")]
        public async Task<IActionResult> GetScheduleByStudent(int studentId, [FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            if (studentId <= 0) return BadRequest("Invalid Student ID.");

            try
            {
                // Return type: Task<List<TurmaScheduleDetailDTO>>
                var schedule = await _dbServices.GetStudentSchedule(studentId, start, end);

                if (schedule == null || schedule.Count == 0)
                {
                    return Ok(new
                    {
                        message = "No schedule found. Verify if the user is an active student and assigned to a turma.",
                        data = new List<TurmaScheduleDetailDTO>()
                    });
                }

                return Ok(schedule);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error.", details = ex.Message });
            }
        }



    } // the end
}
