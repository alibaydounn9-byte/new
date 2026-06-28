-- Roblox Aimbot Script (LocalScript)
-- Place inside StarterPlayerScripts or execute client-side

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local Camera = workspace.CurrentCamera

local LocalPlayer = Players.LocalPlayer

-- Settings
local Settings = {
    Enabled = false,
    ToggleKey = Enum.KeyCode.E,
    TeamCheck = true,
    MaxDistance = 500,
    AimPart = "Head",
    Smoothness = 1,
    FOV = 250,
    ShowFOV = true,
}

-- FOV circle
local FOVCircle = Drawing.new("Circle")
FOVCircle.Thickness = 1
FOVCircle.Radius = Settings.FOV
FOVCircle.Color = Color3.fromRGB(255, 255, 255)
FOVCircle.Filled = false
FOVCircle.Transparency = 0.7
FOVCircle.Visible = Settings.ShowFOV

local function isAlive(player)
    local character = player.Character
    if not character then return false end
    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid or humanoid.Health <= 0 then return false end
    local part = character:FindFirstChild(Settings.AimPart)
    if not part then return false end
    return true
end

local function isTeammate(player)
    if not Settings.TeamCheck then return false end
    if LocalPlayer.Team and player.Team == LocalPlayer.Team then
        return true
    end
    return false
end

local function isVisible(part)
    local origin = Camera.CFrame.Position
    local direction = (part.Position - origin).Unit * Settings.MaxDistance
    local rayParams = RaycastParams.new()
    rayParams.FilterType = Enum.RaycastFilterType.Exclude
    rayParams.FilterDescendantsInstances = {LocalPlayer.Character}

    local result = workspace:Raycast(origin, direction, rayParams)
    if result then
        local hit = result.Instance
        if hit:IsDescendantOf(part.Parent) then
            return true
        end
        return false
    end
    return true
end

local function getClosestPlayer()
    local closest = nil
    local shortestDist = Settings.FOV
    local screenCenter = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y / 2)

    for _, player in ipairs(Players:GetPlayers()) do
        if player == LocalPlayer then continue end
        if isTeammate(player) then continue end
        if not isAlive(player) then continue end

        local character = player.Character
        local aimPart = character:FindFirstChild(Settings.AimPart)
        if not aimPart then continue end

        local screenPos, onScreen = Camera:WorldToViewportPoint(aimPart.Position)
        if not onScreen then continue end

        local dist = (Vector2.new(screenPos.X, screenPos.Y) - screenCenter).Magnitude
        if dist < shortestDist then
            if isVisible(aimPart) then
                shortestDist = dist
                closest = aimPart
            end
        end
    end

    return closest
end

-- Toggle aimbot on/off
UserInputService.InputBegan:Connect(function(input, processed)
    if processed then return end
    if input.KeyCode == Settings.ToggleKey then
        Settings.Enabled = not Settings.Enabled
        FOVCircle.Color = Settings.Enabled
            and Color3.fromRGB(0, 255, 0)
            or Color3.fromRGB(255, 255, 255)
    end
end)

-- Main loop
RunService.RenderStepped:Connect(function()
    FOVCircle.Position = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y / 2)
    FOVCircle.Radius = Settings.FOV
    FOVCircle.Visible = Settings.ShowFOV

    if not Settings.Enabled then return end
    if not isAlive(LocalPlayer) then return end

    local target = getClosestPlayer()
    if not target then return end

    local targetCF = CFrame.lookAt(Camera.CFrame.Position, target.Position)

    if Settings.Smoothness > 1 then
        Camera.CFrame = Camera.CFrame:Lerp(targetCF, 1 / Settings.Smoothness)
    else
        Camera.CFrame = targetCF
    end
end)
