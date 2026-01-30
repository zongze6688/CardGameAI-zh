FROM modelscope-registry.cn-beijing.cr.aliyuncs.com/modelscope-repo/python:3.10

WORKDIR /home/user/app

COPY ./ /home/user/app

ENTRYPOINT ["python", "-u", "server.py"]
