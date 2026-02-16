namespace Auth_Services.Services;

using Auth_Services.DTOs;
using Auth_Services.Models;
using Auth_Services.Services;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Timers;

public class AutoScheduler
{
    private readonly DbServices _dbServices;

    // Lists initialized to empty to prevent null refs
    // Modules to Loop throght
    private List<TurmaModuleDetails> _modules_to_book = new();
    private List<TurmaModuleDetails> _modules_to_book_1up = new();
    // Schedules to Lineup!
    private List<TeacherAvailability> _teacher_availability = new();
    private List<TeacherScheduleDetailDTO> _teacher_schedule = new();
    private List<TurmaScheduleDetailDTO> _schedule_turma = new();

    public AutoScheduler(DbServices db_service)
    {
        _dbServices = db_service;
    }

    public async Task GetAllInfo(int turmaId, DateTime start, DateTime end)
    {
        // 1. Sync Progress first
        await _dbServices.UpdateProgressToPresent();

        // 2. Load Teacher and Turma Data in parallel (Efficiency!)
        var task3 = _dbServices.GetTurmaScheduleByRange(turmaId, start, end);

        

        // 3. Find current and next tier modules
        for (int tier = 1; tier < 100; tier++)
        {
            var currentTierModules = await _dbServices.GetIncompleteModulesByTier(turmaId, tier);

            if (currentTierModules.Count == 0) continue; // Skip empty tiers

            // Check if this tier is actually finished
            bool tierFinished = currentTierModules.All(m => m.HoursCompleted >= m.TotalDuration);

            if (!tierFinished)
            {
                _modules_to_book = currentTierModules;
                // Grab the next tier as well for "1up" logic
                _modules_to_book_1up = await _dbServices.GetIncompleteModulesByTier(turmaId, tier + 1);

                Console.WriteLine($"[DEBUG] Focusing on Tier {tier}. Next tier ({tier + 1}) has {_modules_to_book_1up.Count} modules.");
                break; // We found our target work area
            }
        }

        _schedule_turma = await task3;

        DumpDebugInfo();
    }

    // Individual getters kept as Task for flexibility
    public async Task GetTeacherInfo(int teacherId, DateTime start, DateTime end)
    {
        var filter = new AvailabilityFilter { FormadorId = teacherId, StartTime = start, EndTime = end };
        _teacher_availability = await _dbServices.GetTeacherAvailability(filter);
        _teacher_schedule = await _dbServices.GetTeacherScheduleByRange(teacherId, start, end);
    }

    private async Task<Dictionary<int, int>> GetModuleProgress(List<TurmaModuleDetails> modules)
    {
        // Key: ModuleId (int), Value: TotalScheduled (int)
        var moduleProgressMap = new Dictionary<int, int>();

        foreach (var item in modules)
        {
            // 1. Call the service (assuming it's async based on your context)
            var mp = await _dbServices.GetModuleProgress(item.TurmaId, item.ModuleId);

            if (mp != null)
            {
                // 2. Add to Dictionary: Key is the ID, Value is the Scheduled hours
                // We use the indexer [] to avoid errors if the same ID appears twice
                moduleProgressMap[item.ModuleId] = mp.TotalScheduled;
            }
            else
            {
                // If no progress found:  0 hours scheduled
                moduleProgressMap[item.ModuleId] = 0;
            }
        }

        return moduleProgressMap;
    }


    public async Task<List<ScheduleRequest>> ScheduleClasses(DateTime start, DateTime end)
    {
        List<ScheduleRequest> book_classes = new List<ScheduleRequest>();

        //Sort both lists by HoursCompleted
        var sortedCurrent = _modules_to_book.OrderBy(m => m.HoursCompleted).ToList();
        var sortedNext = _modules_to_book_1up.OrderBy(m => m.HoursCompleted).ToList();

        // Join them (Current tier first, then Next tier)
        var allModules = sortedCurrent.Concat(sortedNext).ToList();

        Dictionary<int, int> moduleScheduledMap = await GetModuleProgress(allModules);

        foreach (var module in allModules)
        {
            // Get data for teacher/module
            var filter = new AvailabilityFilter { FormadorId = module.TeacherId, StartTime = start, EndTime = end };
            _teacher_availability = await _dbServices.GetTeacherAvailability(filter);
            _teacher_schedule = await _dbServices.GetTeacherScheduleByRange(module.TeacherId, start, end);
            // Note: _schedule_turma should already be loaded for the whole range in GetAllInfo

            foreach (var teacher_av in _teacher_availability)
            {
                // Check: Is the Teacher already busy at this specific time?
                bool teacherBusy = _teacher_schedule.Any(s => s.DateTime == teacher_av.DataHora);

                // Check: Is the Turma already in another class at this specific time?
                bool turmaBusy = _schedule_turma.Any(s => s.DateTime == teacher_av.DataHora);

                // Only book if BOTH are free
                if (!teacherBusy && !turmaBusy && module.TotalDuration > moduleScheduledMap[module.ModuleId])
                {
                    book_classes.Add(new ScheduleRequest
                    {
                        TurmaId = module.TurmaId,
                        ModuleId = module.ModuleId,
                        FormadorId = module.TeacherId,
                        DateTime = teacher_av.DataHora, // The slot we found
                        SalaId = 0
                    });

                    // increment the Scheduled
                    moduleScheduledMap[module.ModuleId] += 1;

                    // Book Class!
                    _schedule_turma.Add(new TurmaScheduleDetailDTO { DateTime = teacher_av.DataHora });
                }
                else
                {
                    Console.WriteLine($"[SKIP] Slot {teacher_av.DataHora} taken. Teacher Busy: {teacherBusy}, Turma Busy: {turmaBusy}");
                }
            }
        }
        return book_classes;
    }


    public async Task<List<ScheduleRequest>> FindRoom(List<ScheduleRequest>  book_classes, DateTime start, DateTime end)
    {
        List<Sala> salas = await _dbServices.GetAvailableSalas(start, end);

        // All classes in one Room :)
        if (salas.Count > 0)
        {
            foreach (var bc in book_classes)
            {
                bc.SalaId = salas[0].Id;
            }
        }
        // well... gonna have to move from class to class... :/
        else
        {
            foreach (var bc in book_classes)
            {
                salas = await _dbServices.GetAvailableSalas(bc.DateTime, bc.DateTime);
                if (salas.Count > 0)
                { bc.SalaId = salas[0].Id; }
            }
        }

        // Clean up and return! :)
        book_classes.RemoveAll(bc => bc.SalaId == 0);
        return book_classes;
    }



    public void DumpDebugInfo()
    {
        //return; // debug switch! XD

        var options = new JsonSerializerOptions { WriteIndented = true };

        Console.WriteLine("=================================================");
        Console.WriteLine("🚀 AUTO-SCHEDULER DEBUG DUMP");
        Console.WriteLine($"Timestamp: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
        Console.WriteLine("=================================================");

        Console.WriteLine("\n[1] MODULES TO BOOK (Current Tier):");
        Console.WriteLine(JsonSerializer.Serialize(_modules_to_book, options));

        Console.WriteLine("\n[2] MODULES TO BOOK (Next Tier):");
        Console.WriteLine(JsonSerializer.Serialize(_modules_to_book_1up, options));

        Console.WriteLine("\n[3] TEACHER AVAILABILITY:");
        Console.WriteLine(JsonSerializer.Serialize(_teacher_availability, options));

        Console.WriteLine("\n[4] TEACHER EXISTING SCHEDULE:");
        Console.WriteLine(JsonSerializer.Serialize(_teacher_schedule, options));

        Console.WriteLine("\n[5] TURMA EXISTING SCHEDULE:");
        Console.WriteLine(JsonSerializer.Serialize(_schedule_turma, options));

        Console.WriteLine("=================================================");
        Console.WriteLine("🔚 END OF DUMP");
        Console.WriteLine("=================================================");
    }
}
