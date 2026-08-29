package com.zuantou.controller;

import com.zuantou.pojo.Result;
import com.zuantou.pojo.dto.CheckUserNameDTO;
import com.zuantou.pojo.dto.LoginDTO;
import com.zuantou.pojo.dto.RegisterDTO;
import com.zuantou.pojo.vo.CheckUserNameVO;
import com.zuantou.pojo.vo.CreatInviteCodeVO;
import com.zuantou.pojo.vo.LoginVO;
import com.zuantou.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/user")
@Tag(name = "Users")
public class UserController {
    final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/checkUserName")
    @Operation(summary = "check_user_name")
    public Result<CheckUserNameVO> checkUserName(CheckUserNameDTO checkUserNameDTO){
        return userService.checkUserName(checkUserNameDTO);
    }

    @GetMapping("/creatInviteCode")
    @Operation(summary = "creat_invite_code")
    public Result<CreatInviteCodeVO> creatInviteCode(){
        return userService.creatInviteCode();
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
