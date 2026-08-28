package com.zuantou.controller;

import com.zuantou.Utils.UserContext;
import com.zuantou.pojo.Result;
import com.zuantou.pojo.dto.LoginDTO;
import com.zuantou.pojo.dto.RegisterDTO;
import com.zuantou.pojo.vo.CreatInviteCodeVO;
import com.zuantou.pojo.vo.LoginVO;
import com.zuantou.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@RestController
@RequestMapping("/api/user")
@Tag(name = "Users")
public class UserController {
    final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/getUsersName")
    @Operation(summary = "check_user_name")
    public Result<Set<String>> selectUserNames(){
        return userService.selectUserNames();
    }

    @PostMapping("/creatInviteCode")
    @Operation(summary = "creat_invite_code")
    public Result<CreatInviteCodeVO> creatInviteCode(){
        Result<CreatInviteCodeVO> result = userService.creatInviteCode();
        UserContext.clear();
        return result;
    }

    @PostMapping("/register")
    @Operation(summary = "register")
    public Result<LoginVO> register(RegisterDTO registerDTO){
        return userService.register(registerDTO);
    }

    @PostMapping("/login")
    public Result<LoginVO> login(LoginDTO loginDTO){
        return userService.login(loginDTO);
    }
}
