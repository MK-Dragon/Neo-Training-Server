using Auth_Services.DTOs;
using Auth_Services.Models;
using Auth_Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace Auth_Services.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CoursesController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public CoursesController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
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

        // ** CRUD Curses **


        [HttpGet("courses")]
        [AllowAnonymous] // TODO: Change to Authorized later
        public async Task<IActionResult> GetAllCurses()
        {
            var users = await _dbServices.GetAllCourses(); // List<Course>
            return Ok(users);
        }

        [HttpGet("course-id")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCourseById(int course_id)
        {
            try
            {
                var course = await _dbServices.GetCourseWithModules(course_id); // retunrs Course
                if (course == null || course.Id == 0)
                {
                    return NotFound("Course not found.");
                }
                return Ok(course);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("all-courses-summary")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllCoursesSummary()
        {
            try
            {
                // Call the service method that returns List<Course> without Modules
                var courses = await _dbServices.GetAllCoursesSummary();

                if (courses == null || courses.Count == 0)
                {
                    // Return 200 with empty list or 204 No Content
                    return Ok(new List<Course>());
                }

                return Ok(courses);
            }
            catch (Exception ex)
            {
                // Log the error for debugging
                Console.WriteLine($"Error in GetAllCoursesSummary endpoint: {ex.Message}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("create-course")]
        [AllowAnonymous]
        public async Task<IActionResult> CreateCourse([FromBody] NewCourse course)
        {
            if (course == null || string.IsNullOrEmpty(course.Name))
            {
                return BadRequest("Invalid course data. Name is required.");
            }

            try
            {
                int result = await _dbServices.AddCourse(course);

                if (result > 0)
                {
                    return Ok(new { message = "Course created successfully." });
                }
                else
                {
                    return BadRequest("Failed to create course. It might already exist.");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("update-course")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateCourse([FromBody] Course course)
        {
            // Basic validation to ensure we have a valid ID and object
            if (course == null || course.Id <= 0)
            {
                return BadRequest(new { message = "Invalid course data. A valid Course ID is required." });
            }

            try
            {
                // Call the DB function you provided
                bool success = await _dbServices.UpdateCourse(course);

                if (!success)
                {
                    // If the DB returns false, it means the ID likely doesn't exist
                    return NotFound(new { message = $"Course with ID {course.Id} not found." });
                }

                return Ok(new { message = "Course updated successfully." });
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPatch("delete-course/{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> DeleteCourse(int id)
        {
            if (id <= 0) return BadRequest("Invalid Course ID.");

            try
            {
                bool success = await _dbServices.DeleteCourse(id);

                if (!success)
                {
                    return NotFound(new { message = $"Course with ID {id} not found." });
                }

                return Ok(new { message = "Course and its module associations marked as deleted." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        // * Courses Starting in 60 days!
        [HttpGet("upcoming")]
        public async Task<IActionResult> GetUpcomingCourses()
        {
            try
            {
                var courses = await _dbServices.GetUpcomingCourses();

                if (courses == null || courses.Count == 0)
                {
                    return Ok(new List<CoursesStarting>()); // Return empty list instead of 404
                }

                return Ok(courses);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }



    } // End of CursesController class
}
