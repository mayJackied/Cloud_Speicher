package com.zuantou.service;

import com.zuantou.pojo.Result;
import com.zuantou.pojo.dto.LoginDTO;
import com.zuantou.pojo.dto.RegisterDTO;
import com.zuantou.pojo.vo.CreatInviteCodeVO;
import com.zuantou.pojo.vo.LoginVO;

import java.util.Set;

public interface UserService {
    Result<Set<String>> selectUserNames();

    Result<CreatInviteCodeVO> creatInviteCode();

    Result<LoginVO> register(RegisterDTO registerDTO);

    Result<LoginVO> login(LoginDTO loginDTO);
}
