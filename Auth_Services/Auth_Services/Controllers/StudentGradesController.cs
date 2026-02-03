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
    public class StudentGradesController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public StudentGradesController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
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

        // ** Reads: **

        // All Students and all modules (in turma)
        [HttpGet("turma/{turmaId}/grades")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTurmaGrades(int turmaId)
        {
            if (turmaId <= 0) return BadRequest("Invalid Turma ID.");

            try
            {
                var grades = await _dbServices.GetGradesByTurma(turmaId); //List<StudentGradeDetail>
                return Ok(grades);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Sigle Student: Grades for all modules (in turma)
        [HttpGet("student-report")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStudentReport([FromQuery] int studentId, [FromQuery] int turmaId)
        {
            if (studentId <= 0 || turmaId <= 0)
                return BadRequest("Student ID and Turma ID are required.");

            try
            {
                var grades = await _dbServices.GetStudentGradesInTurma(studentId, turmaId); // List<StudentReportCard>()

                if (grades == null || grades.Count == 0)
                    return NotFound("No enrollment found for this student in the specified turma.");

                return Ok(grades);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Grades from all students in a module
        [HttpGet("turma-module-grades")]
        [AllowAnonymous]
        public async Task<IActionResult> GetGradesByModule([FromQuery] int turmaId, [FromQuery] int moduleId)
        {
            if (turmaId <= 0 || moduleId <= 0)
                return BadRequest("Both Turma ID and Module ID are required.");

            try
            {
                var grades = await _dbServices.GetGradesForTurmaModule(turmaId, moduleId);
                return Ok(grades); // List<ModuleGradeEntry>
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // ** Writes: **

        [HttpPost("submit-grade")]
        [AllowAnonymous]
        public async Task<IActionResult> SubmitGrade([FromBody] GradeSubmission submission)
        {
            if (submission.Grade < 0 || submission.Grade > 20) // Assuming 0-20 scale
            {
                return BadRequest("Grade must be between 0 and 20.");
            }

            try
            {
                bool success = await _dbServices.UpsertStudentGrade(submission);

                if (!success)
                {
                    return BadRequest("Could not submit grade. Verify if student is enrolled in this turma.");
                }

                return Ok(new { message = "Grade successfully saved." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

    } // end
}
