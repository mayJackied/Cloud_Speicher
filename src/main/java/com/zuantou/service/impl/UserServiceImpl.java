package com.zuantou.service.impl;

import com.zuantou.config.ErrorCode;
import com.zuantou.config.MyValFileProperties;
import com.zuantou.pojo.dto.CheckUserNameDTO;
import com.zuantou.pojo.vo.CheckUserNameVO;
import com.zuantou.utils.JwtUtils;
import com.zuantou.utils.UserContext;
import com.zuantou.mapper.InviteCodeMapper;
import com.zuantou.mapper.UserMapper;
import com.zuantou.pojo.InviteCode;
import com.zuantou.pojo.Result;
import com.zuantou.pojo.User;
import com.zuantou.pojo.dto.LoginDTO;
import com.zuantou.pojo.dto.RegisterDTO;
import com.zuantou.pojo.vo.CreatInviteCodeVO;
import com.zuantou.pojo.vo.LoginVO;
import com.zuantou.service.UserService;
import org.springframework.beans.BeanUtils;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.*;

@Service
public class UserServiceImpl implements UserService {
    final UserMapper userMapper;
    final InviteCodeMapper inviteCodeMapper;
    final JwtUtils jwtUtils;
    final MyValFileProperties fileProperties;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public Result<CheckUserNameVO> checkUserName(CheckUserNameDTO checkUserNameDTO) {
        if (userMapper.selectByUserName(checkUserNameDTO.getName()) == null) {
            return Result.success(new CheckUserNameVO(true));
        }
        return Result.success(new CheckUserNameVO(false));
    }

    @Override
    public Result<CreatInviteCodeVO> creatInviteCode() {
        User user = userMapper.selectById(UserContext.getUserId());
        if (user == null){
            return Result.error(ErrorCode.USER_NOT_FOUND);
        }

        if (user.isAdmin()) {
            String inviteCode = UUID.randomUUID().toString();
            inviteCodeMapper.insert(new InviteCode(inviteCode));

            return Result.success(new CreatInviteCodeVO(inviteCode));
        }

        return Result.error(ErrorCode.NOT_ADMIN);
    }

    @Override
    public Result<LoginVO> register(RegisterDTO registerDTO) {
        String name = registerDTO.getName();
        if (name == null || name.isBlank()) {
            return Result.error(ErrorCode.USERNAME_EMPTY);
        }

        if (name.length() < 3 || name.length() > 20) {
            return Result.error(ErrorCode.USERNAME_LENGTH_INVALID );
        }

        if (!name.matches("^[A-Za-z][A-Za-z0-9_]*$")) {
            return Result.error(ErrorCode.USERNAME_FORMAT_INVALID);
        }

        String password = registerDTO.getPassword();
        if (password == null || password.isBlank()) {
            return Result.error(ErrorCode.PASSWORD_EMPTY);
        }

        if (password.length() < 8 || password.length() > 64) {
            return Result.error(ErrorCode.PASSWORD_LENGTH_INVALID);
        }

        if (!password.matches("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]+$")) {
            return Result.error(ErrorCode.PASSWORD_FORMAT_INVALID);
        }

        String inviteCodeValue = registerDTO.getInviteCode();
        if (inviteCodeValue == null || inviteCodeValue.isBlank()) {
            return Result.error(ErrorCode.INVITE_CODE_EMPTY);
        }


        for (InviteCode inviteCode : inviteCodeMapper.selectList(null)) {
            if (inviteCode.getInviteCode().equals(registerDTO.getInviteCode())) {
                User u = new User(null, passwordEncoder.encode(registerDTO.getPassword()),registerDTO.getName(), false, false);
                userMapper.insert(u);

                inviteCodeMapper.deleteById(inviteCode.getInviteCode());

                LoginVO loginVO = new LoginVO();
                BeanUtils.copyProperties(u, loginVO);

                loginVO.setToken(jwtUtils.generateJwt(Map.of("user_id", loginVO.getUserId())));

                File file = new File(fileProperties.getPath()+"/"+u.getUserId());
                file.mkdir();

                return Result.success(loginVO);
            }
        }
        return Result.error(ErrorCode.INVITE_CODE_INVALID);
    }

    @Override
    public Result<LoginVO> login(LoginDTO loginDTO) {
        User u = userMapper.selectByUserName(loginDTO.getName());
        if (u == null){
            return Result.error(ErrorCode.USER_NOT_FOUND);
        }
        if (passwordEncoder.matches(loginDTO.getPassword(), u.getPassword())) {
            LoginVO loginVO = new LoginVO();
            BeanUtils.copyProperties(u, loginVO);


            loginVO.setToken(jwtUtils.generateJwt(Map.of("user_id", loginVO.getUserId())));
            return Result.success(loginVO);
        }
        return Result.error(ErrorCode.USERNAME_OR_PASSWORD_INVALID);
    }

    @Override
    public Result<Void> delete() {
        if ((userMapper.deleteById(UserContext.getUserId())) == 1) {
            return Result.success();
        }
        return Result.error(ErrorCode.DELETE_USER_FAILED);
    }


    public UserServiceImpl(UserMapper userMapper, InviteCodeMapper inviteCodeMapper, JwtUtils jwtUtils, MyValFileProperties myValFileProperties) {
        this.userMapper = userMapper;
        this.inviteCodeMapper = inviteCodeMapper;
        this.jwtUtils = jwtUtils;
        this.fileProperties = myValFileProperties;
    }
}
