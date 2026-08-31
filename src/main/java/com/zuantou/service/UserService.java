package com.zuantou.service;

import com.zuantou.pojo.Result;
import com.zuantou.pojo.dto.CheckUserNameDTO;
import com.zuantou.pojo.dto.LoginDTO;
import com.zuantou.pojo.dto.RegisterDTO;
import com.zuantou.pojo.vo.CheckUserNameVO;
import com.zuantou.pojo.vo.CreatInviteCodeVO;
import com.zuantou.pojo.vo.LoginVO;


public interface UserService {
    Result<CheckUserNameVO> checkUserName(CheckUserNameDTO checkUserNameDTO);

    Result<CreatInviteCodeVO> creatInviteCode();

    Result<LoginVO> register(RegisterDTO registerDTO);

    Result<LoginVO> login(LoginDTO loginDTO);

    Result<Void> delete();

    Result<Void> logout();
}
