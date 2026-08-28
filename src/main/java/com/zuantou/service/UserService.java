package com.zuantou.service;

import com.zuantou.pojo.Result;
import com.zuantou.pojo.dto.CreatInviteCodeDTO;
import com.zuantou.pojo.dto.LoginDTO;
import com.zuantou.pojo.dto.RegisterDTO;
import com.zuantou.pojo.vo.CreatInviteCodeVO;
import com.zuantou.pojo.vo.UserVO;

import java.util.Set;

public interface UserService {
    Result<Set<String>> selectUserNames();

    Result<CreatInviteCodeVO> creatInviteCode(CreatInviteCodeDTO creatDTO);

    Result<UserVO> register(RegisterDTO registerDTO);

    Result<UserVO> login(LoginDTO loginDTO);
}
