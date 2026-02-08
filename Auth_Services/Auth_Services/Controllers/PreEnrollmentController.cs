using Auth_Services.DTOs;
using Auth_Services.Models;
using Auth_Services.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Auth_Services.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PreEnrollmentController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public PreEnrollmentController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
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

        // Pre Enroll Student
        [HttpPost("pre-enroll")]
        public async Task<IActionResult> PreEnroll([FromBody] PreEnrollRequest request)
        {
            if (request.UserId <= 0 || request.TurmaId <= 0)
                return BadRequest("Invalid User or Turma ID.");

            try
            {
                // (Student can pre-enroll in muiltiple courses as a 2nd option)

                bool success = await _dbServices.PreEnrollStudent(request.UserId, request.TurmaId);

                if (success)
                {
                    return Ok(new { message = "Successfully pre-enrolled for the course!" });
                }

                return BadRequest("Pre-enrollment failed. Ensure the user is an active student and not deleted.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Server error: {ex.Message}");
            }
        }

        // Get Students Pending Enrollment
        [HttpGet("pending-list")]
        public async Task<IActionResult> GetPendingList()
        {
            try
            {
                var pendingStudents = await _dbServices.GetPendingEnrollments();

                if (pendingStudents == null || pendingStudents.Count == 0)
                {
                    return Ok(new List<PendingEnrollmentDTO>());
                }

                return Ok(pendingStudents);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Delete Pre-Enroll Entries after Student has been enrolled into Turma
        [HttpDelete("clear-pre-enroll/{userId}")]
        public async Task<IActionResult> ClearPreEnroll(int userId)
        {
            if (userId <= 0) return BadRequest("Invalid User ID.");

            try
            {
                bool success = await _dbServices.ClearUserPreEnrollments(userId);

                if (success)
                {
                    return Ok(new { message = "Pre-enrollment records cleared successfully." });
                }

                return NotFound("No active pre-enrollments found for this user.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }





    }
}
