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
    public class SalasController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;


        public SalasController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)
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


        [HttpPost("create-sala")]
        [AllowAnonymous]
        public async Task<IActionResult> CreateSala([FromBody] NewSala sala)
        {
            if (sala == null || string.IsNullOrEmpty(sala.Nome))
            {
                return BadRequest("Invalid sala data.");
            }

            try
            {
                int result = await _dbServices.AddSala(sala);

                if (result > 0)
                {
                    return Ok(new { message = "Sala created successfully." });
                }
                else
                {
                    return BadRequest("Failed to create sala. It might already exist.");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // all salas
        [HttpGet("all-salas")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllSalas()
        {
            try
            {
                var salas = await _dbServices.GetAllSalas();

                // Return the list (will be [] if no rooms exist)
                return Ok(salas);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        // GET: /api/salas/get-by-id/5
        [HttpGet("get-sala-id/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var sala = await _dbServices.GetSalaById(id);
            if (sala == null) return NotFound($"Sala with ID {id} not found.");
            return Ok(sala);
        }

        // GET: /api/salas/get-by-name?name=Sala A
        [HttpGet("get-sala-name")]
        public async Task<IActionResult> GetByName([FromQuery] string name)
        {
            if (string.IsNullOrEmpty(name)) return BadRequest("Name parameter is required.");

            var sala = await _dbServices.GetSalaByName(name);
            if (sala == null) return NotFound($"Sala with name '{name}' not found.");
            return Ok(sala);
        }

        // Edit sala
        [HttpPut("update-sala")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateSala([FromBody] Sala sala)
        {
            if (sala == null || sala.Id <= 0)
            {
                return BadRequest("Invalid Sala data or ID.");
            }

            try
            {
                bool success = await _dbServices.UpdateSala(sala);

                if (!success)
                {
                    return NotFound(new { message = "Update failed. Room not found." });
                }

                return Ok(new { message = "Sala updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Delete sala (soft delete)
        [HttpDelete("delete-sala/{salaId}")]
        [AllowAnonymous]
        public async Task<IActionResult> DeleteSala(int salaId)
        {
            try
            {
                bool isDeleted = await _dbServices.DeleteSala(salaId);

                if (!isDeleted)
                {
                    // Returns 404 if the room wasn't found or was already deleted
                    return NotFound(new { message = $"Sala with ID {salaId} not found." });
                }

                return Ok(new { message = "Sala status updated to deleted." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }






    } // the end
}
