using Auth_Services.DTOs;
using Auth_Services.Models;
using Auth_Services.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Auth_Services.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StatisticsController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public StatisticsController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
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

        // Teacher Stats:
        [HttpGet("teacher-module-history/{teacherId}")]
        public async Task<IActionResult> GetTeacherModuleHistory(int teacherId)
        {
            var history = await _dbServices.GetTeacherModuleHistory(teacherId);

            if (history == null || history.Count == 0)
            {
                return Ok(new List<TeacherModuleHistoryDTO>()); // Return empty list if no history found
            }

            return Ok(history);
        }


        // Course Stats:
        [HttpGet("report-total-hours-taugh-per-course")]
        public async Task<IActionResult> GetCourseWorkload() // List<CourseWorkloadDTO>
        {
            try
            {
                var report = await _dbServices.GetTotalHoursTaughtPerCourse();
                return Ok(report);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // !! 3 Number of Students Right Now!
        [HttpGet("ongoing-stats-courses-students")]
        public async Task<IActionResult> GetOngoingStats()
        {
            try
            {
                var stats = await _dbServices.GetOngoingStats_CoursesStudents();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // !! 5 Top 10 Teachers!
        [HttpGet("top-teachers")]
        public async Task<IActionResult> GetTopTeachers()
        {
            try
            {
                var topTeachers = await _dbServices.GetTopTeachers(); // List<TeacherRankingDTO>
                return Ok(topTeachers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // !! 4 Number of Courses per Area
        [HttpGet("courses-per-areas")]
        public async Task<IActionResult> GetAreasSummary()
        {
            try
            {
                var summary = await _dbServices.GetCourseCountByArea(); // List<AreaCourseCountDTO>
                return Ok(summary);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // !! 1 & 2 Number of Courses (turmas) finnished and ongoing
        [HttpGet("status-finnished-ongoing")]
        public async Task<IActionResult> GetStatusSummary()
        {
            try
            {
                var summary = await _dbServices.GetTurmaStatusSummary(); // List<CoursesStatusSummaryDTO>
                return Ok(summary);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

    } // the end
}
