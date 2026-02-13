package com.example.nts_app

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

data class ServerConfig(val name: String, val ip: String)

class SettingsManager(context: Context) {
    private val prefs = context.getSharedPreferences("nts_settings", Context.MODE_PRIVATE)
    private val gson = Gson()

    fun getServers(): List<ServerConfig> {
        val json = prefs.getString("servers_list", null) ?: return emptyList()
        val type = object : TypeToken<List<ServerConfig>>() {}.type
        return gson.fromJson(json, type)
    }

    fun addServer(name: String, ip: String) {
        val list = getServers().toMutableList()
        list.add(ServerConfig(name, ip))
        prefs.edit().putString("servers_list", gson.toJson(list)).apply()
    }

    fun setCurrentServer(server: ServerConfig) {
        prefs.edit().putString("current_server_name", server.name).apply()
        prefs.edit().putString("current_server_ip", server.ip).apply()
    }

    fun editServer(oldName: String, newName: String, newIp: String) {
        val list = getServers().toMutableList()
        val index = list.indexOfFirst { it.name == oldName }
        if (index != -1) {
            val updatedServer = ServerConfig(newName, newIp)
            list[index] = updatedServer
            saveList(list)

            // If the active server was edited, update the current active selection too
            if (getCurrentServerName() == oldName) {
                setCurrentServer(updatedServer)
            }
        }
    }
    private fun saveList(list: List<ServerConfig>) {
        prefs.edit().putString("servers_list", gson.toJson(list)).apply()
    }

    fun deleteServer(name: String) {
        val list = getServers().toMutableList()
        list.removeAll { it.name == name }
        prefs.edit().putString("servers_list", gson.toJson(list)).apply()
    }

    fun getCurrentServerName(): String? = prefs.getString("current_server_name", null)
    fun getCurrentServerIp(): String? = prefs.getString("current_server_ip", null)
}