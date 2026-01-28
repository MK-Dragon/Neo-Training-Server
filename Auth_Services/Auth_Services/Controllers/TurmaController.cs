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
    public class TurmaController : ControllerBase
    {

        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public TurmaController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
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



        [HttpGet("all-turmas")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllTurmas()
        {
            try
            {
                var turmas = await _dbServices.GetAllTurmas();
                return Ok(turmas);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("create-turma")]
        [AllowAnonymous]
        public async Task<IActionResult> CreateTurma([FromBody] NewTurma turma)
        {
            if (turma == null || string.IsNullOrEmpty(turma.TurmaName) || turma.CourseId <= 0)
            {
                return BadRequest("Invalid Turma data. Name and Course ID are required.");
            }

            try
            {
                int result = await _dbServices.AddTurma(turma);

                if (result > 0)
                {
                    return Ok(new { message = "Turma created successfully." });
                }
                else
                {
                    return BadRequest("Failed to create Turma. Check if the Course ID is valid.");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("update-turma")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateTurma([FromBody] UpdateTurma turma)
        {
            if (turma == null || turma.TurmaId <= 0)
            {
                return BadRequest("Invalid Turma data or ID.");
            }

            try
            {
                bool success = await _dbServices.UpdateTurma(turma);

                if (!success)
                {
                    return NotFound(new { message = "Update failed. Turma not found." });
                }

                return Ok(new { message = "Turma updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpDelete("delete-turma/{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> DeleteTurma(int id)
        {
            if (id <= 0) return BadRequest("Invalid Turma ID.");

            try
            {
                bool success = await _dbServices.DeleteTurma(id);

                if (!success)
                {
                    return NotFound(new { message = $"Turma with ID {id} not found." });
                }

                return Ok(new { message = "Turma and its enrollments have been marked as deleted." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPatch("recover-turma/{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> RecoverTurma(int id)
        {
            try
            {
                // Your DB service should set isDeleted = 0 for this ID
                bool success = await _dbServices.RecoverTurma(id);
                if (!success) return NotFound("Turma not found.");
                return Ok(new { message = "Turma restored successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }


        // Students in Turma
        [HttpGet("list-students/{turmaId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStudentsByTurma(int turmaId) // retuns List<StudentInTurmaDTO>
        {
            if (turmaId <= 0) return BadRequest("Invalid Turma ID.");

            try
            {
                var students = await _dbServices.GetStudentsByTurma(turmaId);

                if (students == null || students.Count == 0)
                {
                    return NotFound(new { message = "No students found for this Turma." });
                }

                return Ok(students);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }





    } // The End
}
