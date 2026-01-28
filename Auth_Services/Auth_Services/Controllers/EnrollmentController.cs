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
    public class EnrollmentController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public EnrollmentController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
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



        [HttpPost("enroll-student")]
        [AllowAnonymous]
        public async Task<IActionResult> EnrollStudent([FromBody] NewEnrollment enrollment)
        {
            if (enrollment == null || enrollment.StudentId <= 0 || enrollment.TurmaId <= 0)
                return BadRequest("Invalid IDs provided.");

            string status = await _dbServices.EnrollStudent(enrollment);

            return status switch
            {
                "Success" => Ok(new { message = "Student enrolled successfully!" }),
                "InvalidRole" => BadRequest("Enrollment failed: User is not a Student or is inactive."),
                _ => StatusCode(500, "An error occurred during enrollment.")
            };
        }

        [HttpPatch("delete-enrollment/{studentId}/{turmaId}")]
        [AllowAnonymous]
        public async Task<IActionResult> DeleteEnrollment(int studentId, int turmaId)
        {
            try
            {
                bool success = await _dbServices.DeleteEnrollment(studentId, turmaId);

                if (!success)
                {
                    return NotFound(new { message = "Enrollment not found or already deleted." });
                }

                return Ok(new { message = "Student successfully unenrolled (soft delete)." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPatch("update-student-enrollment")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateEnrollment([FromBody] UpdateEnrollment data)
        {
            if (data == null || data.StudentId <= 0)
            {
                return BadRequest("Invalid enrollment data.");
            }

            try
            {
                bool success = await _dbServices.UpdateStudentTurma(data);

                if (!success)
                {
                    return BadRequest("Update failed. The student might already be in the new class or the original enrollment wasn't found.");
                }

                return Ok(new { message = "Student moved to new Turma successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("unenrolled-students")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUnenrolledStudents()
        {
            try
            {
                var students = await _dbServices.GetUnenrolledStudents();
                return Ok(students);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }



    } // The End
}
